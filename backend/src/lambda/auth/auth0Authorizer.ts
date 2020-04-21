import { CustomAuthorizerEvent, CustomAuthorizerResult } from "aws-lambda";
import "source-map-support/register";

import { verify} from "jsonwebtoken";
import { createLogger } from "../../utils/logger";

import { JwtPayload } from "../../auth/JwtPayload";

const logger = createLogger("auth");

// TODO: Provide a URL that can be used to download a certificate that can be used
// to verify JWT token signature.
// To get this URL you need to go to an Auth0 page -> Show Advanced Settings -> Endpoints -> JSON Web Key Set
const cert = `-----BEGIN CERTIFICATE-----
MIIDBzCCAe+gAwIBAgIJXfhJrFaDOZGWMA0GCSqGSIb3DQEBCwUAMCExHzAdBgNV
BAMTFmRldi0zNGYzLTJyaC5hdXRoMC5jb20wHhcNMjAwNDIwMTA1NDExWhcNMzMx
MjI4MTA1NDExWjAhMR8wHQYDVQQDExZkZXYtMzRmMy0ycmguYXV0aDAuY29tMIIB
IjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu6I1N2HcdIamiMujB2TZVBEX
AkRpIiq0u+h2ZMKFK/N6ZloRGZIhsIdNuAJBqN32MOh8vFUydW02APSrBH2j2TwQ
7+1rOhP/DplhLiZ1uWQKlVzzmTvVBJdEX8Fh5L8wJb5IqL2oDGbG2oE0cJ5XgLV2
fL1R5/qExAXH2mFtIXYthYfvYmooh2A/7wqxVXLk9FhCxeRcGpNmg1k/Mgh/sbyo
o13RqYqBuE2NqsSyc53VBFHCxkX45CTEKc9F+0PSncW6M7vAGee7PddLnRE9GrDD
48rpXZBtY1dYzVojPpgGNB7gJQuBsziDFPFmfk/DLSeVLjgtwp1/VBgWKveY9wID
AQABo0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBQlSxD516GaZaA3FqHx
z2JEzDqoIzAOBgNVHQ8BAf8EBAMCAoQwDQYJKoZIhvcNAQELBQADggEBAK1J63ft
VBwCy3EU2nM9EqwLmicQ+rg2DZDqUXajepeSnKWQsKSdHiUjJn7KUmRClP0ENhqy
PiGD1c+lheapN+vcWgnwaMb47OYQ3wqJarkBxnb+nCAp2xQ/G/we732Kt92BTyQ/
HITx+tBe5n4++CQj8VS1/5eJIIyhz/oPaf5m83K3xywn4OEUdA894N2NfbLHgxsv
AT7oprwZmTYdpKziHVoWsKoEz/47DuWu0qIt9Rz/+68rf+Mq7rz7udsTeSnqxFS7
shD5F85Xq73HP7cChuzbevrKWMvO6y3UKSL6lSCF8XPIMNCfwNBC5KV9ChQIwZZe
xnEwQfjT0OCa45U=
-----END CERTIFICATE-----
`;
export const handler = async (
  event: CustomAuthorizerEvent
): Promise<CustomAuthorizerResult> => {
  logger.info("Authorizing a user", event.authorizationToken);
  try {
    const jwtToken = await verifyToken(event.authorizationToken);
    logger.info("User was authorized", jwtToken);

    return {
      principalId: jwtToken.sub,
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: "*"
          }
        ]
      }
    };
  } catch (e) {
    logger.error("User not authorized", { error: e.message });

    return {
      principalId: "user",
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Deny",
            Resource: "*"
          }
        ]
      }
    };
  }
};

async function verifyToken(authHeader: string): Promise<JwtPayload> {
  const token = getToken(authHeader);
  // const jwt: Jwt = decode(token, { complete: true }) as Jwt;

  // console.log(jwt);

  // TODO: Implement token verification
  // You should implement it similarly to how it was implemented for the exercise for the lesson 5
  // You can read more about how to do this here: https://auth0.com/blog/navigating-rs256-and-jwks/
  return verify(token, cert, { algorithms: ["RS256"] }) as JwtPayload;
}

function getToken(authHeader: string): string {
  if (!authHeader) throw new Error("No authentication header");

  if (!authHeader.toLowerCase().startsWith("bearer "))
    throw new Error("Invalid authentication header");

  const split = authHeader.split(" ");
  const token = split[1];

  return token;
}