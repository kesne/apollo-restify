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
        const query = req.body.query;
        const { graphqlResponse, responseInit } = await runHttpQuery([req, res], {
            method: req.method!,
            options,
            query,
            request: convertNodeHttpToRequest(req)
        });
        res.set(responseInit.headers);
        return graphqlResponse;
    };

    return graphqlHandler;
}
