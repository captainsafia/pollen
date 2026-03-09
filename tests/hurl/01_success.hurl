POST {{host}}/api/v1/feedback
Authorization: Bearer {{api_key_success}}
[MultipartFormData]
payload: {"type":"bug_report","title":"Success case bug","description":"The app crashed while opening settings.","targetRepository":"acme/product-feedback","source":{"applicationId":"desktop-app","applicationName":"Desktop Client","channel":"stable","surface":"settings"},"systemTelemetry":{"clientType":"desktop","appVersion":"1.2.3","platform":"linux","buildNumber":"1024","architecture":"x64","locale":"en-US","releaseChannel":"stable"},"clientRequestId":"req-success-1"}
attachments[]: file,../fixtures/sample.log;type=text/plain

HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.githubIssue.repository" == "acme/product-feedback"
jsonpath "$.requestId" exists
jsonpath "$.submittedAt" exists
