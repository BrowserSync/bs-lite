import {Map, Record} from 'immutable';
const OPT_NAME     = 'rewriteRules';
let count          = 0;

/**
 *
 * Usage:
 * 1. Provide a function only
 * rewriteRules: [(req, res, data, options) => data.replace('shane', 'kittie')]
 *
 * 2. Provide a function with predicate
 * rewriteRules: [{
 *   fn: (req, res, data, options) => data.replace('shane', 'kittie'),
 *   predicates: [(req, res) => req.url === '/']
 * }]
 *
 */

export type MiddlewareFn  = (req, res, next) => void;
export type TransformFn   = (req, res, data: string, options: Map<string, any>) => string;
export type Predicate     = (req, res, options: Map<string, any>) => boolean;

export interface RewriteRule {
    fn: TransformFn;
    via: string;
    id: string;
    predicates: Predicate[];
}

/**
 * @param item
 * @returns {Cursor|Map<K, V>|List<T>|Map<string, V>}
 */
export function createOne(item): RewriteRule {
    if (typeof item === 'function') {
        return {
            id: 'bs-rewrite-rule-' + (count += 1),
            via: 'Inline Function',
            fn: item,
            predicates: []
        };
    }
    return {
        id: 'bs-rewrite-rule-' + (count += 1),
        via: 'Inline Function',
        ...item
    }
}
