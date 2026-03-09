POST {{host}}/api/v1/feedback
[MultipartFormData]
payload: {"type":"bug_report","title":"Missing auth","description":"No auth header should fail.","targetRepository":"acme/product-feedback","source":{"applicationId":"desktop-app","applicationName":"Desktop Client"},"systemTelemetry":{"clientType":"desktop","appVersion":"1.0.0","platform":"linux"}}

HTTP 401
[Asserts]
jsonpath "$.error.code" == "unauthorized"
jsonpath "$.requestId" exists
