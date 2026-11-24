FROM python:3.11-alpine

WORKDIR /app

# Copy application files
COPY server.py /app/server.py
COPY public /app/public

ENV PORT=7777
ENV ANTIGRAVITY_DATA_DIR=/data/antigravity
ENV ANTIGRAVITY_CONFIG_DIR=/data/config
ENV PYTHONUNBUFFERED=1

EXPOSE 7777

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:7777/api/projects')" || exit 1

ENTRYPOINT ["python3", "/app/server.py"]
