POST {{host}}/api/v1/feedback
Authorization: Bearer {{api_key_repo}}
[MultipartFormData]
payload: {"type":"feature_request","title":"Repo not allowed path","description":"Key not authorized for this repository.","targetRepository":"acme/product-feedback","source":{"applicationId":"desktop-app","applicationName":"Desktop Client"},"systemTelemetry":{"clientType":"desktop","appVersion":"1.0.4","platform":"linux"}}

HTTP 403
[Asserts]
jsonpath "$.error.code" == "repository_not_allowed"
