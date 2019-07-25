clean:
	rm -rf dist/* dist/.[^.]*
	rm -f dist/fun-nas-server.zip

install: 
	npm install
	fun install

build: clean
	scripts/build.sh

dev: 
	scripts/dev.sh

package: build
	scripts/package.sh

upload:
	ossutil cp -f dist/fun-nas-server.zip oss://buc-demo/fun-nas-server.zip
