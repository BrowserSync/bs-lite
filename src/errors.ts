export enum BSErrorTypes {
    ProxyInvalidInput = 'ProxyInvalidInput',
}

export type BSError = {
    type: BSErrorTypes,
    errors: Array<{
        error: Error,
        meta?: any
    }>
}