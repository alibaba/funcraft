init:
	docker run --rm -it -v $$(pwd):/tmp mcr.microsoft.com/dotnet/core/sdk:3.1 bash -c "cd /tmp && mkdir FSharpDemo && cd FSharpDemo && dotnet new webapi --language F# && python /tmp/init_helper.py"

build:
	docker run --rm -it -v $$(pwd):/tmp mcr.microsoft.com/dotnet/core/sdk:3.1 bash -c "cd /tmp/FSharpDemo && dotnet publish -r linux-x64 -c Release --self-contained true && cd /tmp/FSharpDemo/bin/Release/netcoreapp3.1/linux-x64/publish && mv FSharpDemo bootstrap && chmod +x bootstrap"

deploy: build
	fun deploy -y

# If you have installed the dotnetcore3.1 LTS SDK, you can use the following three commands
init_no_docker:
	mkdir FSharpDemo && cd FSharpDemo && dotnet new webapi --language F# && python ../init_helper.py

build_no_docker:
	cd FSharpDemo && dotnet publish -r linux-x64 -c Release --self-contained true && cd bin/Release/netcoreapp3.1/linux-x64/publish && mv FSharpDemo bootstrap && chmod +x bootstrap

deploy_no_docker: build_no_docker
	fun deploy -y