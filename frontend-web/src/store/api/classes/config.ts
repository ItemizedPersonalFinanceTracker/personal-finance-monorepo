export const UserConfigKey = {
    BypassImageProcessingPopup: "BYPASS_IMAGE_PROCESSING_POPUP",
    AllowImageProcessing: "ALLOW_IMAGE_PROCESSING",
} as const;

export type UserConfigKey = (typeof UserConfigKey)[keyof typeof UserConfigKey];

export interface UserConfig {
    config: UserConfigKey;
    value: boolean;
}

export const userConfigLabel: Record<UserConfigKey, string> = {
    [UserConfigKey.BypassImageProcessingPopup]: "Show popup on receipt upload for image processing",
    [UserConfigKey.AllowImageProcessing]: "Allow image processing",
};
