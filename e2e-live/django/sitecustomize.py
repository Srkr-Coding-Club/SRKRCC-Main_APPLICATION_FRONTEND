"""Windows does not resolve `<bucket>.localhost` (browsers do). The backend signs virtual-hosted S3 URLs, so teach Python's
resolver that any `*.localhost` name is this machine. Loaded automatically because this folder is on PYTHONPATH."""
import socket

_resolve = socket.getaddrinfo


def _getaddrinfo(host, *args, **kwargs):
    if isinstance(host, str) and host.endswith('.localhost'):
        host = '127.0.0.1'
    return _resolve(host, *args, **kwargs)


socket.getaddrinfo = _getaddrinfo
