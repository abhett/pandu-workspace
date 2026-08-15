export type User = {
    id: number;
    uuid: string;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    status: string;
    locale: string;
    timezone: string;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Organization = {
    id: string;
    name: string;
    slug: string;
    role: string;
    settings?: Record<string, unknown>;
};

export type Auth = {
    user: User;
    organization: Organization | null;
    organizations: Organization[];
    permissions: string[];
};
