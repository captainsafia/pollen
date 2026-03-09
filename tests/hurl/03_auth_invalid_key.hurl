POST {{host}}/api/v1/feedback
Authorization: Bearer not-a-valid-key
[MultipartFormData]
payload: {"type":"bug_report","title":"Invalid key path","description":"Invalid key should fail.","targetRepository":"acme/product-feedback","source":{"applicationId":"desktop-app","applicationName":"Desktop Client"},"systemTelemetry":{"clientType":"desktop","appVersion":"1.0.0","platform":"linux"}}

HTTP 401
[Asserts]
jsonpath "$.error.code" == "invalid_api_key"
