# fed-pay-stub-extractor

This repo contains a small utility for extracting structured data from pay stub PDFs generated by [Employee Express](https://www.employeeexpress.gov/).

## Requirements

* Node.js (see [`.nvmrc`](./nvmrc) for recommended version)
* Yarn

## Getting started

First of all, you need to go to Employee Express and download PDFs of your pay stubs. If you have a lot, this will take you a while.

Then, install the dependencies:

```shell
$ yarn
```

Then run the script using `yarn start`, passing in paths to PDF files:

```shell
$ yarn start path/to/your/pay-stub.pdf
```

You can pass multiple PDF files in this way, just add them to the command line:

```shell
$ yarn start path/to/your/pay-stubs/*.pdf
```

By default, the output is in CSV, suitable for copying and pasting into an actual spreadsheet. You can also get JSON if you want:

```shell
$ yarn start path/to/your/pay-stub.pdf --json
```

## How it works

First, this tool uses [`pdf2json`](https://github.com/modesty/pdf2json) to extract text tokens from the PDF file. Then it uses some bespoke and extremely fragile parsing logic to extract structured information.

## FAQ

### Why don't you just download CSV files from Employee Express?

I couldn't figure out how.

### You should simply use a large language model to extract all this information.

That's not a question. Also, I found in my testing that local LLMs weren't _quite_ good enough to get "correct" data out of these PDFs and I didn't really feel like turning my pay stubs into training data for API-based models.

### I got a error. It says "calculated net differs from statement net"

There are a couple of things this could be:

1. Your pay stub might have fields on it that mine doesn't, and so they're not being parsed out.
2. The stated "net" numbers on your pay stub might include factors that are not documented elsewhere on your pay stub. This can happen if an HR snafu leads to your pay stubs being incorrect for some reason.  Double check the numbers and :fingers_crossed: everything just works out.
