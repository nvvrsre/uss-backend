{{- define "notification-service.name" -}}
notification-service
{{- end }}

{{- define "notification-service.fullname" -}}
{{ include "notification-service.name" . }}
{{- end }}
