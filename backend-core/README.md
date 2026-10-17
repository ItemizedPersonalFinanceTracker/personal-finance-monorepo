
Deploy Command:
uv run python manage.py migrate --noinput && uv run gunicorn financeproject.wsgi:application --bind 0.0.0.0:$PORT --worker-class gthread --threads 4 --timeout 160
