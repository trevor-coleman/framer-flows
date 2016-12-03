# Project Info
# This info is presented in a widget when you share.
# http://framerjs.com/docs/#info.info

Framer.Info =
	title: "Flow Controller Regex"
	author: "Trevor Coleman"
	twitter: "@trevorcoleman"
	description: "Experimenting with new Flow Controller, using regEx to programmatically assign event listeners by layer name"


shortcuts = require "shortcuts"

# Import file "framer-flows"
sketch = Framer.Importer.load("imported/framer-flows@2x")
shortcuts.initialize(sketch)

flow = new FlowComponent
flow.showNext(screenOne)

for name, layer of sketch
	if /hamburger/.test name
		layer.onClick -> flow.showOverlayLeft(sideNav)
	if /bottomButton/.test name		
		layer.onClick -> flow.showOverlayBottom(bottomMenu)
	if /showModal/.test name		
		layer.onClick -> flow.showOverlayCenter(modal)
	if /Nav/.test name
		layer.onClick (e,l) ->
			if /NavOne/.test l.name
				nextScreen = screenOne
			else if /NavTwo/.test l.name
				nextScreen = screenTwo
			else if /NavThree/.test l.name
				nextScreen = screenThree	
			if /bottom|modal/.test l.name
				flow.showPrevious()
			if nextScreen
				flow.showNext(nextScreen)

screenOneBG.onClick -> flow.showNext(screenTwo)
screenTwoBG.onClick -> flow.showNext(screenThree)
screenThreeBG.onClick -> flow.showNext(screenOne)