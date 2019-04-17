import { ApolloServerBase, GraphQLOptions } from 'apollo-server-core';
import { Request, Response } from 'restify';
import { renderPlaygroundPage } from '@apollographql/graphql-playground-html';
import { parseAll } from 'accept';

import { graphqlRestify } from './restifyApollo';

export interface ServerRegistration {
    path?: string;
    disableHealthCheck?: boolean;
    onHealthCheck?: (req: Request) => Promise<any>;
}

export class ApolloServer extends ApolloServerBase {
    // Extract Apollo Server options from the request.
    async createGraphQLServerOptions(req: Request, res: Response): Promise<GraphQLOptions> {
        return super.graphQLServerOptions({ req, res });
    }

    // Prepares and returns an async function that can be used by Micro to handle
    // GraphQL requests.
    public createHandler({ path, disableHealthCheck, onHealthCheck }: ServerRegistration = {}) {
        // We'll kick off the `willStart` right away, so hopefully it'll finish
        // before the first request comes in.
        const promiseWillStart = this.willStart();

        return async (req: Request, res: Response) => {
            this.graphqlPath = path || '/graphql';

            await promiseWillStart;

            (await this.handleHealthCheck({
                req,
                res,
                disableHealthCheck,
                onHealthCheck
            })) ||
                this.handleGraphqlRequestsWithPlayground({ req, res }) ||
                (await this.handleGraphqlRequestsWithServer({ req, res })) ||
                res.send(404, null);
        };
    }

    // This integration does not support file uploads.
    protected supportsUploads(): boolean {
        return false;
    }

    // This integration supports subscriptions.
    protected supportsSubscriptions(): boolean {
        return true;
    }

    // If health checking is enabled, trigger the `onHealthCheck`
    // function when the health check URL is requested.
    private async handleHealthCheck({
        req,
        res,
        disableHealthCheck,
        onHealthCheck
    }: {
        req: Request;
        res: Response;
        disableHealthCheck?: boolean;
        onHealthCheck?: (req: Request) => Promise<any>;
    }): Promise<boolean> {
        let handled = false;

        if (!disableHealthCheck && req.url === '/.well-known/apollo/server-health') {
            // Response follows
            // https://tools.ietf.org/html/draft-inadarei-api-health-check-01
            res.header('Content-Type', 'application/health+json');

            if (onHealthCheck) {
                try {
                    await onHealthCheck(req);
                } catch (error) {
                    res.send(503, { status: 'fail' });
                    handled = true;
                }
            }

            if (!handled) {
                res.send(200, { status: 'pass' });
                handled = true;
            }
        }

        return handled;
    }

    // If the `playgroundOptions` are set, register a `graphql-playground` instance
    // (not available in production) that is then used to handle all
    // incoming GraphQL requests.
    private handleGraphqlRequestsWithPlayground({
        req,
        res
    }: {
        req: Request;
        res: Response;
    }): boolean {
        let handled = false;

        if (this.playgroundOptions && req.method === 'GET') {
            const accept = parseAll(req.headers);
            const types = accept.mediaTypes as string[];
            const prefersHTML =
                types.find((x: string) => x === 'text/html' || x === 'application/json') ===
                'text/html';

            if (prefersHTML) {
                const middlewareOptions = {
                    endpoint: this.graphqlPath,
                    subscriptionEndpoint: this.subscriptionsPath,
                    ...this.playgroundOptions
                };
                res.sendRaw(200, renderPlaygroundPage(middlewareOptions), {
                    'Content-Type': 'text/html'
                });
                handled = true;
            }
        }

        return handled;
    }

    // Handle incoming GraphQL requests using Apollo Server.
    private async handleGraphqlRequestsWithServer({
        req,
        res
    }: {
        req: Request;
        res: Response;
    }): Promise<boolean> {
        let handled = false;
        const url = (req.url || '').split('?')[0];
        if (url === this.graphqlPath) {
            const graphqlHandler = graphqlRestify(() => {
                return this.createGraphQLServerOptions(req, res);
            });
            const responseData = await graphqlHandler(req, res);
            res.send(200, responseData);
            handled = true;
        }
        return handled;
    }
}
