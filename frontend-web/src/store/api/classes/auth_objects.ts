export interface loginResponse {
    access: string
    refresh: string
}

export interface refreshTokenResponse {
    access: string
    refresh?: string
}

export interface loginRequest {
    email: string 
    password: string
}

export interface registerRequest {
    name: string
    email: string
    password: string
}

export interface registerResponse {
    id: number
    email: string
}