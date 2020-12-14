build-img:
	docker build -t fc-cpp-runtime  -f build-image/Dockerfile build-image

build: build-img
	docker run --rm -it -v $$(pwd):/tmp fc-cpp-runtime bash -c "cd /tmp && ./build.sh"

deploy: build
	fun deploy -y

.PHONY: deploy