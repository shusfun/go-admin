FROM golang:1.24-alpine AS builder

WORKDIR /src

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories \
  && apk add --no-cache build-base git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 \
  go build -tags "sqlite3,json1" --ldflags "-extldflags -static" -o /out/go-admin .

FROM alpine

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories \
  && apk add --no-cache ca-certificates tzdata

ENV TZ=Asia/Shanghai

COPY --from=builder /out/go-admin /go-admin
# settings.yml 仅作为容器内示例配置；真正的安装完成标志是同目录下的 .installed。
COPY ./config/settings.demo.yml /config/settings.yml
COPY ./go-admin-db.db /go-admin-db.db
RUN chmod +x /go-admin \
  && sed -i 's/port: 18123/port: 8000/' /config/settings.yml

EXPOSE 8000

CMD ["/go-admin", "server", "-c", "/config/settings.yml"]
