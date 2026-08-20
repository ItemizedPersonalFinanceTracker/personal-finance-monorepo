import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";

type ReceiptCameraModalProps = {
    opened: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
};

function stopStream(stream: MediaStream | null) {
    stream?.getTracks().forEach((track) => track.stop());
}

export default function ReceiptCameraModal({
    opened,
    onClose,
    onCapture,
}: ReceiptCameraModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);

    const cleanup = useCallback(() => {
        stopStream(streamRef.current);
        streamRef.current = null;
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const setVideoNode = useCallback((node: HTMLVideoElement | null) => {
        videoRef.current = node;
        if (node && streamRef.current) {
            node.srcObject = streamRef.current;
            void node.play();
        }
    }, []);

    useEffect(() => {
        if (!opened) {
            return;
        }

        let cancelled = false;
        setErrorMessage(null);
        setStarting(true);

        void (async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                if (!cancelled) {
                    setErrorMessage("Camera is not supported in this browser.");
                    setStarting(false);
                }
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: { facingMode: { ideal: "environment" } },
                });
                if (cancelled) {
                    stopStream(stream);
                    return;
                }
                streamRef.current = stream;
                const video = videoRef.current;
                if (video) {
                    video.srcObject = stream;
                    await video.play();
                }
            } catch {
                if (!cancelled) {
                    setErrorMessage(
                        "Could not access the camera. Allow camera permission, or use HTTPS (required on phones).",
                    );
                }
            } finally {
                if (!cancelled) {
                    setStarting(false);
                }
            }
        })();

        return () => {
            cancelled = true;
            cleanup();
        };
    }, [opened, cleanup]);

    const handleClose = () => {
        cleanup();
        onClose();
    };

    const handleCapture = () => {
        const video = videoRef.current;
        if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
            setErrorMessage("Camera is not ready yet. Wait a moment and try again.");
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        if (!context) {
            setErrorMessage("Could not capture photo.");
            return;
        }

        context.drawImage(video, 0, 0);
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    setErrorMessage("Could not capture photo.");
                    return;
                }
                onCapture(
                    new File([blob], `receipt-${Date.now()}.jpg`, {
                        type: "image/jpeg",
                    }),
                );
                handleClose();
            },
            "image/jpeg",
            0.92,
        );
    };

    return (
        <Modal opened={opened} onClose={handleClose} title="Take receipt photo" centered size="lg">
            <Stack gap="md">
                {errorMessage ? (
                    <Alert color="red" title="Camera error">
                        {errorMessage}
                    </Alert>
                ) : null}
                <video
                    ref={setVideoNode}
                    playsInline
                    muted
                    autoPlay
                    className="w-full rounded-md bg-black"
                    style={{ maxHeight: 420, objectFit: "cover" }}
                />
                {starting ? (
                    <Text size="sm" c="dimmed" ta="center">
                        Starting camera…
                    </Text>
                ) : null}
                <Group justify="flex-end" gap="xs">
                    <Button type="button" variant="default" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleCapture}
                        disabled={starting || Boolean(errorMessage)}
                    >
                        Capture
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
