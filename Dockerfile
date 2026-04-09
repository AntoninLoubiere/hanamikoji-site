FROM debian:bookworm-slim AS engine-build

ARG DEBIAN_FRONTEND=noninteractive
ARG STECHEC2_REPO=https://github.com/prologin/stechec2.git
ARG STECHEC2_REF=main
ARG HANAMIKOJI_RULES_REPO=https://github.com/AntoninLoubiere/Hanamikoji.git
ARG HANAMIKOJI_RULES_REF=main

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        cppzmq-dev \
        g++ \
        git \
        libgflags-dev \
        libgtest-dev \
        libzmq3-dev \
        lbzip2 \
        make \
        pkg-config \
        python3 \
        python3-jinja2 \
        python3-yaml \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src

RUN clone_repo() { \
        repo="$1"; ref="$2"; dst="$3"; \
        if [ -n "$ref" ]; then \
            git clone --depth 1 --branch "$ref" "$repo" "$dst"; \
        else \
            git clone --depth 1 "$repo" "$dst"; \
        fi; \
    }; \
    clone_repo "${STECHEC2_REPO}" "${STECHEC2_REF}" stechec2; \
    clone_repo "${HANAMIKOJI_RULES_REPO}" "${HANAMIKOJI_RULES_REF}" hanamikoji-rules; \
    rm -rf /src/stechec2/games/hanamikoji; \
    cp -a /src/hanamikoji-rules /src/stechec2/games/hanamikoji; \
    cd /src/stechec2; \
    python3 ./waf.py configure --prefix=/usr --with-games=hanamikoji; \
    python3 ./waf.py build; \
    python3 ./waf.py install --destdir=/engine-root


FROM python:3.11-slim-bookworm AS runtime

ARG DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=website.settings

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
        libgflags2.2 \
        libzmq5 \
        make \
        ocaml \
        python3-dev \
        tar \
        unzip \
    && install -d -m 0755 /etc/apt/keyrings \
    && curl -fsSL https://www.ucw.cz/isolate/debian/signing-key.asc -o /etc/apt/keyrings/isolate.asc \
    && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/isolate.asc] http://www.ucw.cz/isolate/debian/ bookworm-isolate main" > /etc/apt/sources.list.d/isolate.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends isolate \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    django==4.2.3 \
    django-q \
    daphne \
    psycopg2-binary \
    "channels[daphne]"

COPY --from=engine-build /engine-root/usr/ /usr/

WORKDIR /app
COPY website/ /app/

EXPOSE 8000

CMD ["sh", "-c", "python3 manage.py migrate && daphne -b 0.0.0.0 -p 8000 website.asgi:application"]
