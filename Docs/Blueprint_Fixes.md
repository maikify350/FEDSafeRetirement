Blueprint Fixes

●	Sick Leave is not being populated in PDF field “Sick Leave”
●	Years of Service is not being populated in PDF field “Years of Service”
●	Social Security Net or FERS Supplement is not being populated in PDF field “Projected Social Security”
●	PDF field “Projected Net Monthly” should be calculated as Federal Pension and either Social Security Net or FERS Supplement (if the supplement applies)
●	PDF field “less FEGLI” should be a total of FEGLI + LTC
●	PDF field “Military Time” should be YrsOfMilitaryService if boughtmilitarytime (I think that’s the name) is True
●	All PDF field entries MUST respect form the PDF field formatting.
●	

Notes for LES
FEGLI Changes Notes
Beneficiary Notes
Notes for Other Income
Notes for Other Pensions
Notes for Outstanding Debt
Notes for Liquid
Notes for Trad
Notes for Roth
Notes for Total TSP
Notes for Other 401
Notes for Inherited
Notes for Brokerage
Notes for Stocks
Notes for Anything else


In this example the PDF field Projected Social Security should have been from the Bridge. However, in this case the bridge was not computed at all and this example the client is under the age 62. All clients less than 62 years old the bridge should be applied and the PDF field Net Bridge should be applied to the PDF field Projected Social Security. When a client is over 62 years old then the PDF field Net Social Security should be injected in the field Projected Social Security.