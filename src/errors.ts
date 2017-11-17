export enum BSErrorLevel {
    Fatal = 'Fatal',
    Warn = 'Fatal',
}
export enum BSErrorType {
    ProxyInvalidInput = 'ProxyInvalidInput',
    PortNotAvailable = 'PortNotAvailable',
    PortDetectError = 'PortDetectError',
}

export type BSError<T = any> = {
    level: BSErrorLevel,
    type: BSErrorType,
    errors: Array<{
        error: Error,
        meta?: T
    }>
}

export type ProxyInvalidInputError = BSError<() => string[]>
export type PortNotAvailableError = BSError<() => string[]>
export type PortDetectError = BSError;

export function printErrors(errors: BSError[]): string {
    return errors.map((error: BSError) => {
        return [
            `   Error Type: ${error.type}`,
            `  Error Level: ${error.level}`,
            error.errors.map(item => {
                return [
                    `Error Message: ${item.error.message}`,
                    item.meta ? item.meta().join('\n') : ''
                ].filter(Boolean).join('\n')
            }),
        ].join('\n');
    }).join('\n\n');
}