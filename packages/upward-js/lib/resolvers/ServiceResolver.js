const debug = require('debug')('upward-js:ServiceResolver');
const { inspect } = require('util');
const { execute, makePromise } = require('apollo-link');
const { HttpLink } = require('apollo-link-http');
const { isPlainObject, fromPairs } = require('lodash');
const AbstractResolver = require('./AbstractResolver');
const GraphQLDocument = require('../compiledResources/GraphQLDocument');
class ServiceResolver extends AbstractResolver {
    static get resolverType() {
        return 'service';
    }
    static get telltale() {
        return 'url';
    }
    async resolve(definition) {
        const die = msg => {
            throw new Error(
                `Invalid arguments to ServiceResolver: ${inspect(definition, {
                    compact: false
                })}.\n\n${msg}`
            );
        };
        if (!definition.url) {
            die('No URL specified.');
        }
        if (!definition.query) {
            die('No GraphQL query document specified.');
        }
        if (
            definition.variables &&
            (!isPlainObject(definition.variables) ||
                Object.values(definition.variables).some(
                    value => typeof value !== 'string'
                ))
        ) {
            die(
                `Variables must be a simple object of keys to context lookups.`
            );
        }
        debug('validated config %o', definition);
        const toResolve = [
            this.visitor.upward(definition, 'url'),
            this.visitor.upward(definition, 'query'),
            definition.method
                ? this.visitor.upward(definition, 'method')
                : 'POST',
            definition.headers
                ? this.visitor.upward(definition, 'headers')
                : {},
            definition.variables
                ? Promise.all(
                      Object.entries(definition.variables).map(
                          async ([key, value]) => [
                              key,
                              await this.visitor.context.get(value)
                          ]
                      )
                  )
                : {}
        ];

        const [
            url,
            query,
            method,
            headers,
            variableEntries
        ] = await Promise.all(toResolve);

        const variables = fromPairs(variableEntries);

        debug(
            'url retrieved: "%s", query resolved: "%s", creating link',
            url,
            query
        );

        const link = new HttpLink({
            uri: url,
            fetch: this.visitor.io.networkFetch,
            headers,
            useGETForQueries: method === 'GET'
        });

        let parsedQuery;
        if (typeof query === 'string') {
            parsedQuery = new GraphQLDocument(query, this.visitor.io);
            await parsedQuery.compile();
        } else if (query instanceof GraphQLDocument) {
            parsedQuery = query;
        } else {
            throw new Error(`Unknown type passed to 'query'.`);
        }

        debug('running query with %o', variables);

        return makePromise(
            execute(link, { query: await parsedQuery.render(), variables })
        ).then(({ data, errors }) => {
            if (errors && errors.length > 0) {
                throw new Error(errors[0].message);
            } else {
                return { data };
            }
        });
    }
}

module.exports = ServiceResolver;