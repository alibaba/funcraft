clean:
	rm -rf dist

install: 
	npm install
	fun install

build: clean install
	scripts/build.sh

dev: 
	scripts/dev.sh

package: build
	scripts/package.sh

upload:
	ossutil cp -f dist/fun-nas-server.zip oss://buc-demo/fun-nas-server.zip
