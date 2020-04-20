import * as AWS from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";
import { DocumentClient } from "aws-sdk/clients/dynamodb";

const XAWS = AWSXRay.captureAWS(AWS);

import { TodoItem } from "../models/TodoItem";
import { TodoUpdate } from "../models/TodoUpdate";

export class TodosFunctions {
  constructor(
    private docClient: DocumentClient = createDynamoDBClient(),
    private S3 = createS3Bucket(),
    private todosTable = process.env.TODOS_TABLE,
    private bucket = process.env.S3_BUCKET,
    private urlExp = process.env.SIGNED_URL_EXPIRATION,
    private index = process.env.USER_ID_INDEX
  ) {}

  async getAllTodes(userId: string): Promise<TodoItem[]> {
    console.log("get all todos");

    const result = await this.docClient
      .query({
        TableName: this.todosTable,
        IndexName: this.index,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId
        }
      })
      .promise();
    const items = result.Items;
    return items as TodoItem[];
  }

  async createTodo(todo: TodoItem): Promise<TodoItem> {
    await this.docClient
      .put({
        TableName: this.todosTable,
        Item: todo
      })
      .promise();
    return todo;
  }

  async deleteTodo(todoId: string, userId: string) {
    const deleteTodo = await this.docClient
      .delete({
        TableName: this.todosTable,
        Key: { userId, todoId }
      })
      .promise();
    return { Deleted: deleteTodo };
  }
  async updateTodo(userId: string, todoId: string, updatedTodo: TodoUpdate) {
    const updtedTodo = await this.docClient
      .update({
        TableName: this.todosTable,
        Key: { userId, todoId },
        ExpressionAttributeNames: { "#N": "name" },
        UpdateExpression: "set #N=:todoName, dueDate=:dueDate, done=:done",
        ExpressionAttributeValues: {
          ":todoName": updatedTodo.name,
          ":dueDate": updatedTodo.dueDate,
          ":done": updatedTodo.done
        },
        ReturnValues: "UPDATED_NEW"
      })
      .promise();
    return { Updated: updtedTodo };
  }
  async generateUploadUrl(todoId: string, userId: string): Promise<string> {
    const uploadUrl = this.S3.getSignedUrl("putObject", {
      Bucket: this.bucket,
      Key: todoId,
      Expires: this.urlExp
    });
    await this.docClient
      .update({
        TableName: this.todosTable,
        Key: { userId, todoId },
        UpdateExpression: "set attachmentUrl=:URL",
        ExpressionAttributeValues: {
          ":URL": uploadUrl.split("?")[0]
        },
        ReturnValues: "UPDATED_NEW"
      })
      .promise();

    return uploadUrl;
  }
}

function createDynamoDBClient() {
  if (process.env.IS_OFFLINE) {
    console.log("Creating a local DynamoDB instance");
    return new XAWS.DynamoDB.DocumentClient({
      region: "localhost",
      endpoint: "http://localhost:8000"
    });
  }
  return new XAWS.DynamoDB.DocumentClient();
}

function createS3Bucket() {
  return new XAWS.S3({
    signatureVersion: "v4"
  });
}
