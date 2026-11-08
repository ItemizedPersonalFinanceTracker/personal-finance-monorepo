import numpy as np
import cv2

from PIL import Image
# import 

file_name = r'receipts\20201007_110604.jpg'
# img = Image.open(file_name)
# img.thumbnail((800,800), Image.ANTIALIAS)
# img


def opencv_resize(image, ratio):
    width = int(image.shape[1] * ratio)
    height = int(image.shape[0] * ratio)
    dim = (width, height)
    return cv2.resize(image, dim, interpolation = cv2.INTER_AREA)


# approximate the contour by a more primitive polygon shape
def approximate_contour(contour):
    peri = cv2.arcLength(contour, True)
    return cv2.approxPolyDP(contour, 0.032 * peri, True)

def get_receipt_contour(contours, image_area):
    if len(contours) == 0:
        return None
    largest = max(contours, key=cv2.contourArea)
    # Ignore specks. A receipt page covers a large part of the photo.
    if cv2.contourArea(largest) < 0.2 * image_area:
        return None
    approx = approximate_contour(largest)
    if len(approx) == 4:
        return approx
    return np.int32(cv2.boxPoints(cv2.minAreaRect(largest))).reshape(-1, 1, 2)

def contour_to_rect(contour, resize_ratio):
    pts = contour.reshape(4, 2)
    rect = np.zeros((4, 2), dtype = "float32")
    # top-left point has the smallest sum
    # bottom-right has the largest sum
    s = pts.sum(axis = 1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    # compute the difference between the points:
    # the top-right will have the minumum difference 
    # the bottom-left will have the maximum difference
    diff = np.diff(pts, axis = 1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect / resize_ratio


def wrap_perspective(img, rect):
    # unpack rectangle points: top left, top right, bottom right, bottom left
    (tl, tr, br, bl) = rect
    # compute the width of the new image
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    # compute the height of the new image
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    # take the maximum of the width and height values to reach
    # our final dimensions
    maxWidth = max(int(widthA), int(widthB))
    maxHeight = max(int(heightA), int(heightB))
    # destination points which will be used to map the screen to a "scanned" view
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype = "float32")
    # calculate the perspective transform matrix
    M = cv2.getPerspectiveTransform(rect, dst)
    # warp the perspective to grab the screen
    return cv2.warpPerspective(img, M, (maxWidth, maxHeight))

def _color_image(image):
    return Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

def format_receipt(image_file):
    image_file.seek(0)
    encoded = np.frombuffer(image_file.read(), dtype=np.uint8)
    image_file.seek(0)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not read receipt image")
    # Downscale image as finding receipt contour is more efficient on a small image
    resize_ratio = 500 / image.shape[0]
    small = opencv_resize(image, resize_ratio)
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    # The page is the large bright region. Text edges are not the page.
    _, mask = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    receipt_contour = get_receipt_contour(contours, small.shape[0] * small.shape[1])
    if receipt_contour is None:
        return _color_image(image)

    scanned = wrap_perspective(image, contour_to_rect(receipt_contour, resize_ratio))
    if scanned.shape[0] < 50 or scanned.shape[1] < 50:
        return _color_image(image)
    return _color_image(scanned)

# if __name__ == '__main__':
#     # main(r'receipts\20201007_110604.jpg')
#     main(r'receipts\test_receipt2.jpg')
# # print(get_receipt_contour(largest_contours))