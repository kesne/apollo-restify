import { GraphQLOptions, runHttpQuery, convertNodeHttpToRequest } from 'apollo-server-core';
import { Request, Response } from 'restify';

// Allowed Restify Apollo Server options.
export interface RestifyGraphQLOptionsFunction {
    (req?: Request): GraphQLOptions | Promise<GraphQLOptions>;
}

// Build and return an async function that passes incoming GraphQL requests
// over to Apollo Server for processing, then fires the results/response back.
export function graphqlRestify(options: GraphQLOptions | RestifyGraphQLOptionsFunction) {
    if (!options) {
        throw new Error('Apollo Server requires options.');
    }

    if (arguments.length > 1) {
        throw new Error(`Apollo Server expects exactly one argument, got ${arguments.length}`);
    }

    const graphqlHandler = async (req: Request, res: Response) => {
        return runHttpQuery([req, res], {
            method: req.method!,
            options,
            query: req.body,
            request: convertNodeHttpToRequest(req)
        });
    };

    return graphqlHandler;
}
