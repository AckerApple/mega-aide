
export function xmlDocToString(xmlDoc: Document | Element) {
  const resultDoc = transformDoc(xmlDoc)
  return new XMLSerializer().serializeToString(resultDoc)
}

function transformDoc(xmlDoc: Document | Element) {
  var xsltDoc = new DOMParser().parseFromString([
    // describes how we want to modify the XML - indent everything
    '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
    '  <xsl:strip-space elements="*"/>',
    '  <xsl:template match="para[content-style][not(text())]">', // change to just text() to strip space in text nodes
    '    <xsl:value-of select="normalize-space(.)"/>',
    '  </xsl:template>',
    '  <xsl:template match="node()|@*">',
    '    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
    '  </xsl:template>',
    '  <xsl:output indent="yes"/>',
    '</xsl:stylesheet>',
  ].join('\n'), 'application/xml')

  var xsltProcessor = new XSLTProcessor()    
  xsltProcessor.importStylesheet(xsltDoc)
  return xsltProcessor.transformToDocument(xmlDoc)
}