clean:
	rm -rf dist

install: 
	npm install
	fun install

build: clean install
	npm run build
	mkdir -p ./dist/.fun/root
	cp -r ./.fun/root/ ./dist/.fun/root

dev: 
	npm run dev
	fun local start

package: build
	cd ./dist && zip -r fun-nas-server.zip  * .[^.]* -x "*.zip" -x ".fun/root/usr/share/*"
