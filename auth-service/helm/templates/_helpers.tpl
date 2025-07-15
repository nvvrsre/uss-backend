{{- define "auth-service.name" -}}
auth-service
{{- end }}

{{- define "auth-service.fullname" -}}
{{ include "auth-service.name" . }}
{{- end }}
