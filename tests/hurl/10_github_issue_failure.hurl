POST {{host}}/api/v1/feedback
Authorization: Bearer {{api_key_gh_issue}}
x-test-github-mode: issue_fail
[MultipartFormData]
payload: {"type":"feature_request","title":"GitHub issue failure path","description":"Mocked issue creation failure.","targetRepository":"acme/product-feedback","source":{"applicationId":"desktop-app","applicationName":"Desktop Client"},"systemTelemetry":{"clientType":"desktop","appVersion":"1.0.7","platform":"linux"}}

HTTP 502
[Asserts]
jsonpath "$.error.code" == "github_issue_creation_failed"
