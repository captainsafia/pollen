POST {{host}}/api/v1/feedback
Authorization: Bearer {{api_key_rate}}
[MultipartFormData]
payload: {"type":"bug_report","title":"Rate limit first request","description":"First request should pass.","targetRepository":"acme/product-feedback","source":{"applicationId":"desktop-app","applicationName":"Desktop Client"},"systemTelemetry":{"clientType":"desktop","appVersion":"1.0.5","platform":"linux"}}

HTTP 200
[Asserts]
jsonpath "$.status" == "ok"

POST {{host}}/api/v1/feedback
Authorization: Bearer {{api_key_rate}}
[MultipartFormData]
payload: {"type":"bug_report","title":"Rate limit second request","description":"Second request should hit api key rate limit.","targetRepository":"acme/product-feedback","source":{"applicationId":"desktop-app","applicationName":"Desktop Client"},"systemTelemetry":{"clientType":"desktop","appVersion":"1.0.5","platform":"linux"}}

HTTP 429
[Asserts]
jsonpath "$.error.code" == "rate_limited"
