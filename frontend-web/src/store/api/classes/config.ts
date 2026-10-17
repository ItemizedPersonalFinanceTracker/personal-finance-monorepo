export const UserConfigKey = {
    ShowImageProcessingPopup: "SHOW_IMAGE_PROCESSING_POPUP",
} as const;

export type UserConfigKey = (typeof UserConfigKey)[keyof typeof UserConfigKey];

export interface UserConfig {
    config: UserConfigKey;
    value: boolean;
}
