# Personal Finance

A personal spending tracker. You log receipts (by hand, from a photo, or from a spreadsheet), then see where the money went by period, category, and over time.

The app is a monorepo: a React frontend (`frontend-web`) and a Django API (`backend-core`).

**Frontend:** [https://personal-finance-monorepo.vercel.app](https://personal-finance-monorepo.vercel.app)

## Test account

| Email | Password |
| --- | --- |
| test@test.com | 1234 |

Sign in with that account to browse sample spending, or register a new account from the login page.
For security reasons, I have not included any of my actual receipts, so there are no receipts with images to look at. Feel free to add your own receipts to the test account. 

## Flow

1. Open the app and sign in (or create an account).
2. **Home** shows how much you have spent this week, month, and year, plus charts of that spending.
3. **Add a bill** records a new receipt. Type it in, or upload or photograph a receipt so the store, total, date, category, and line items are filled in for you. You can edit anything before saving.
4. **Receipts** lists what you have saved. Open a row for the line items and image, edit or delete a receipt, or import a batch from Excel.
5. **Profile** shows your name and join date, the categories used to classify spending, and receipt-scan settings.
6. **Sign out** from the menu returns you to the login page.

Every page after login shares the same header. The menu button opens navigation to Home, Add a bill, Receipts, Profile, and Sign out.

## Pages

### Login (`/login`)

Email and password sign-in. A link on the same page switches to registration (name, email, and password). After a successful sign-in you land on Home.

### Home (`/home`)

The dashboard for the signed-in account:

- **Money spent** for this week, this month, and this year.
- **Category breakdown**, a pie chart you can switch between week, month, and year.
- **Time breakdown**, a line chart of spending over time, filterable by period, start date, and category.

### Add a bill (`/home/add_bill`)

A form for one receipt: store, category, amount, date, and optional line items. You can add a category on the spot. Drop an image, pick a file, or take a photo; if image processing is allowed, the form is filled from the scan and you confirm it before saving.

### Receipts (`/home/receipts`)

A scrolling list of receipts (store, date, category, and total). Expand a row to see line items and the receipt image. Edit or delete from the row. The import button uploads an Excel file of receipts.

### Profile (`/home/profile`)

Your name and the date you joined, the spending categories on the account (with a way to add more), and two settings that control receipt photos: whether to ask before processing an image, and whether image processing is allowed.
