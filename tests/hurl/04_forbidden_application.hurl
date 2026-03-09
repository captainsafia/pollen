POST {{host}}/api/v1/feedback
Authorization: Bearer {{api_key_app_mismatch}}
[MultipartFormData]
payload: {"type":"bug_report","title":"App mismatch path","description":"API key app mismatch should fail.","targetRepository":"acme/product-feedback","source":{"applicationId":"another-app","applicationName":"Desktop Client"},"systemTelemetry":{"clientType":"desktop","appVersion":"1.0.1","platform":"linux"}}

HTTP 403
[Asserts]
jsonpath "$.error.code" == "forbidden_application"
