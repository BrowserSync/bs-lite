export enum BSErrorLevel {
    Fatal = 'Fatal',
    Warn = 'Fatal',
}
export enum BSErrorTypes {
    ProxyInvalidInput = 'ProxyInvalidInput',
}

export type BSError<T = any> = {
    level: BSErrorLevel,
    type: BSErrorTypes,
    errors: Array<{
        error: Error,
        meta?: T
    }>
}

export type ProxyInvalidInputError = BSError<{input: any, examples: string[]}>