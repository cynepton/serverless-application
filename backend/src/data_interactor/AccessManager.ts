import * as AWS from "aws-sdk";
const AWSXRay = require('aws-xray-sdk');
import {DocumentClient} from "aws-sdk/clients/dynamodb";
import {Types} from 'aws-sdk/clients/s3';
import {TodoItem} from "../models/TodoItem";
import {TodoUpdate} from "../models/TodoUpdate";
import { createLogger } from '../utils/logger'

const XAWS = AWSXRay.captureAWS(AWS)
const logger = createLogger('accessManager');

export class ToDoAccess {
    constructor(
        private readonly docClient: DocumentClient = new XAWS.DynamoDB.DocumentClient(),
        private readonly s3Client: Types = new XAWS.S3({signatureVersion: 'v4'}),
        private readonly todoTable = process.env.TODOS_TABLE,
        private readonly s3BucketName = process.env.S3_BUCKET_NAME) {
    }

    async getAllToDo(userId: string): Promise<TodoItem[]> {
        logger.info('Getting all todo');


        const params = {
            TableName: this.todoTable,
            KeyConditionExpression: "#userId = :userId",
            ExpressionAttributeNames: {
                "#userId": "userId"
            },
            ExpressionAttributeValues: {
                ":userId": userId
            }
        };

        const result = await this.docClient.query(params).promise();
        logger.info(result);
        const items = result.Items;

        return items as TodoItem[]
    }

    async createToDo(todoItem: TodoItem): Promise<TodoItem> {
        logger.info('Creating new ToDo');
        const params = {
            TableName: this.todoTable,
            Item: todoItem,
        };

        const result = await this.docClient.put(params).promise();
        logger.info(result);

        return todoItem as TodoItem;
    }

    async updateToDo(todoUpdate: TodoUpdate, todoId: string, userId: string): Promise<TodoUpdate> {
        logger.info("Updating todo");

        const params = {
            TableName: this.todoTable,
            Key: {
                "userId": userId,
                "todoId": todoId
            },
            UpdateExpression: "set #a = :a",
            ExpressionAttributeNames: {
                "#a": "attachmentUrl"
            },
            ExpressionAttributeValues: {
                ":a": todoUpdate['attachmentUrl'],
            },
            ReturnValues: "ALL_NEW"
        };

        const result = await this.docClient.update(params).promise();
        logger.info(result);
        const attributes = result.Attributes;

        return attributes as TodoUpdate;
    }

    async deleteToDo(todoId: string, userId: string): Promise<string> {
        logger.info("Deleting todo");

        const params = {
            TableName: this.todoTable,
            Key: {
                "userId": userId,
                "todoId": todoId
            },
        };

        const result = await this.docClient.delete(params).promise();
        logger.info(result);

        return "" as string;
    }

     async generateUploadUrl(todoId: string): Promise<string> {
        logger.info("Generating URL");

        const url = this.s3Client.getSignedUrl('putObject', {
            Bucket: this.s3BucketName,
            Key: todoId,
            Expires: 1000,
        });
        logger.info(url);

        return url as string;
    }

    async generateDownloadUrl(todoId: string): Promise<string> {
        logger.info("Generating URL");

        const url = this.s3Client.getSignedUrl('getObject', {
            Bucket: this.s3BucketName,
            Key: todoId,
            Expires: 1000,
        });
        logger.info(url);

        return url as string;
    }
}