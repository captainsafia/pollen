POST {{host}}/api/v1/feedback
Authorization: Bearer {{api_key_repo_disabled}}
[MultipartFormData]
payload: {"type":"bug_report","title":"Repo disabled path","description":"Configured repository disabled should fail.","targetRepository":"acme/disabled-feedback","source":{"applicationId":"desktop-app","applicationName":"Desktop Client"},"systemTelemetry":{"clientType":"desktop","appVersion":"1.0.8","platform":"linux"}}

HTTP 403
[Asserts]
jsonpath "$.error.code" == "repository_disabled"
