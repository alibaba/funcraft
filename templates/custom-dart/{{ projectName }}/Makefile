.PHONY: deploy invoke

build:
	docker run --rm -it -v $$(pwd):/tmp google/dart:2.8.4 bash -c "export PUB_HOSTED_URL=https://pub.flutter-io.cn && cd tmp/code && dart2native index.dart && mv index.exe bootstrap"
	chmod +x code/bootstrap

deploy: build
	fun deploy -y

invoke:
	fun invoke