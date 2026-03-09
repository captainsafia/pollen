POST {{host}}/api/v1/feedback
Authorization: Bearer {{api_key_attachment}}
[MultipartFormData]
payload: {"type":"bug_report","title":"Attachment invalid path","description":"Executable attachment should fail.","targetRepository":"acme/product-feedback","source":{"applicationId":"desktop-app","applicationName":"Desktop Client"},"systemTelemetry":{"clientType":"desktop","appVersion":"1.0.3","platform":"linux"}}
attachments[]: file,fixtures/malware.exe;application/octet-stream

HTTP 400
[Asserts]
jsonpath "$.error.code" == "invalid_attachment"
