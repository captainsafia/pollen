POST {{host}}/api/v1/feedback
Authorization: Bearer {{api_key_validation}}
[MultipartFormData]
payload: {"type":"bug_report","title":"   ","description":"","targetRepository":"invalid_repo","source":{"applicationId":"desktop-app","applicationName":"Desktop Client"},"systemTelemetry":{"clientType":"desktop","appVersion":"1.0.2","platform":"linux"}}

HTTP 400
[Asserts]
jsonpath "$.error.code" == "invalid_request"
jsonpath "$.error.details" exists
