FROM python:3.11-alpine

# Security: Create unprivileged runtime user and group
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup

WORKDIR /app

# Copy application files
COPY studio /app/studio
COPY server.py /app/server.py
COPY public /app/public

ENV PORT=7777
ENV HOST=0.0.0.0
ENV ANTIGRAVITY_DATA_DIR=/data/antigravity
ENV ANTIGRAVITY_CONFIG_DIR=/data/config
ENV PYTHONUNBUFFERED=1

# Run container as unprivileged user
USER appuser

EXPOSE 7777

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:7777/health')" || exit 1

ENTRYPOINT ["python3", "/app/server.py"]
