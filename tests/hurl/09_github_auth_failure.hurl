POST {{host}}/api/v1/feedback
Authorization: Bearer {{api_key_gh_auth}}
x-test-github-mode: auth_fail
[MultipartFormData]
payload: {"type":"bug_report","title":"GitHub auth failure path","description":"Mocked GitHub auth failure.","targetRepository":"acme/product-feedback","source":{"applicationId":"desktop-app","applicationName":"Desktop Client"},"systemTelemetry":{"clientType":"desktop","appVersion":"1.0.6","platform":"linux"}}

HTTP 502
[Asserts]
jsonpath "$.error.code" == "github_auth_failed"
