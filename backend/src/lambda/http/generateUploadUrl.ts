import 'source-map-support/register'

import {APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler} from 'aws-lambda'
import {generateUploadUrl, generateDownloadUrl} from "../../manipulationlogic/CoreToDo";
import {updateToDo} from "../../manipulationlogic/CoreToDo";
import { UpdateTodoRequest } from '../../requests/UpdateTodoRequest';
import { createLogger } from '../../utils/logger'

const logger = createLogger('generateUploadUrl');

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // TODO: Return a presigned URL to upload a file for a TODO item with the provided id
    logger.info("Processing Event ", event);
    const todoId = event.pathParameters.todoId;

    const URL = await generateUploadUrl(todoId);
    const URL2 = await generateDownloadUrl(todoId);

    logger.info("Resource URL")
    logger.info(URL.split("?")[0]);  

    const updateRequestObj: UpdateTodoRequest = {
        attachmentUrl: URL2
    };
    
    const authorization = event.headers.Authorization;
    const split = authorization.split(' ');
    const jwtToken = split[1];

    await updateToDo(updateRequestObj, todoId, jwtToken);

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
            uploadUrl: URL,
        })
    };
};
