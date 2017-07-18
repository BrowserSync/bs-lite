/**
 * Update an option via a path
 * @param bs
 * @param path
 * @param fn
 * @returns {Observable<any>}
 */
export function updateOption (bs, path, fn) {
    return bs.ask('updateOption', {
        path: [].concat(path).filter(Boolean),
        fn,
    })
}