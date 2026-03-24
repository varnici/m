from rest_framework.renderers import JSONRenderer

class StandardResponseRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        status_code = renderer_context['response'].status_code

        response_data = {
            'success': status_code >= 200 and status_code < 300,
            'data': None,
            'error': None
        }

        # If it's an error response, put data into error
        if not response_data['success']:
            if isinstance(data, dict) and 'detail' in data:
                response_data['error'] = data['detail']
            else:
                response_data['error'] = data
        else:
            response_data['data'] = data

        return super().render(response_data, accepted_media_type, renderer_context)
