const fs = require('fs');
const file = 'src/views/clients/ClientFullPageDetail.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. FieldDisplay
content = content.replace(
  '<Typography variant="caption" color="text.secondary" display="block">',
  '<Typography variant="body2" color="text.secondary" display="block">'
);
content = content.replace(
  '<Typography variant="body2" fontWeight={500}>',
  '<Typography variant="body1" fontWeight={500}>'
);

// 2. SortableTab
content = content.replace(
  '<Typography variant="body2" fontWeight={600}>{label}</Typography>',
  '<Typography variant="body1" fontWeight={600}>{label}</Typography>'
);
content = content.replace(
  '<Typography variant="caption" fontWeight={700}>{count}</Typography>',
  '<Typography variant="body2" fontWeight={700}>{count}</Typography>'
);

// 3. Website & Customer
content = content.replace(
  '<Typography variant="caption" color="text.secondary" display="block">\n                            Website',
  '<Typography variant="body2" color="text.secondary" display="block">\n                            Website'
);
content = content.replace(
  '<Typography variant="body2" fontWeight={500} sx={{ display: \'flex\', alignItems: \'center\', gap: 1 }}>',
  '<Typography variant="body1" fontWeight={500} sx={{ display: \'flex\', alignItems: \'center\', gap: 1 }}>'
);
content = content.replace(
  '<Typography variant="caption" color="text.secondary" display="block">\n                          Customer',
  '<Typography variant="body2" color="text.secondary" display="block">\n                          Customer'
);

// 4. Address, Phone, Email
content = content.replace(
  /<Typography variant="caption" fontWeight=\{600\} color="primary"/g,
  '<Typography variant="body2" fontWeight={600} color="primary"'
);
content = content.replace(
  /<Typography variant="body2">\{addr.street\}<\/Typography>/g,
  '<Typography variant="body1">{addr.street}</Typography>'
);
content = content.replace(
  /<Typography variant="body2">\{addr.street2\}<\/Typography>/g,
  '<Typography variant="body1">{addr.street2}</Typography>'
);
content = content.replace(
  /<Typography variant="body2">\{addr.city\}, \{addr.state\} \{addr.zipCode\}<\/Typography>/g,
  '<Typography variant="body1">{addr.city}, {addr.state} {addr.zipCode}</Typography>'
);
content = content.replace(
  /className="text-lg font-medium/g,
  'className="text-xl font-medium'
);

// 5. Expand State Logic
content = content.replace(
  `  const [expandedSections, setExpandedSections] = useState({`,
  `  const allExpanded = expandedSections.requests && expandedSections.quotes && expandedSections.jobs && expandedSections.invoices;\n\n  const handleToggleExpandAll = () => {\n    const val = !allExpanded;\n    setExpandedSections({ requests: val, quotes: val, jobs: val, invoices: val });\n  };\n\n  const [expandedSections, setExpandedSections] = useState({`
);

// Remove actionsAtBottom state
content = content.replace(
  `  const [actionsAtBottom, setActionsAtBottom] = useLocalStorage('client-detail-actions-bottom', false)\n\n`,
  ``
);

// Remove the Layout switch box and section header
const rightSectionStart = content.indexOf('          {/* RIGHT SECTION (30%) */}');
const layoutSwitchStart = content.indexOf('              <Box sx={{ display: \'flex\', alignItems: \'center\', justifyContent: \'space-between\', mb: 2 }}>');
const layoutSwitchEnd = content.indexOf('              <Box sx={{ display: \'flex\', flexDirection:actionsAtBottom ? \'column-reverse\' : \'column\', gap: 4 }}>');

content = content.replace(
  content.substring(layoutSwitchStart, layoutSwitchEnd),
  ''
);

// Remove the flex direction wrapper logic
content = content.replace(
  `<Box sx={{ display: 'flex', flexDirection:actionsAtBottom ? 'column-reverse' : 'column', gap: 4 }}>\n                <Box>\n                  <SectionHeader>Actions</SectionHeader>`,
  `<Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>\n                <Box>\n                  <SectionHeader>Actions</SectionHeader>`
);

// Increase action button sizes
content = content.replace(
  /Button variant="contained" size="small"/g,
  'Button variant="contained" size="large" sx={{ py: 1.5, fontSize: "1rem" }}'
);

// Section Header logic for Expand/Collapse All
content = content.replace(
  `<SectionHeader>Related Items</SectionHeader>`,
  `<Box className="flex items-center justify-between mb-4">
                    <SectionHeader sx={{ mb: 0, fontSize: "1.1rem" }}>Related Items</SectionHeader>
                    <Chip 
                      label={allExpanded ? "Collapse All" : "Expand All"} 
                      onClick={handleToggleExpandAll} 
                      size="medium" 
                      variant="filled" 
                      color="primary" 
                      className="cursor-pointer font-medium" 
                      sx={{ fontWeight: "bold" }}
                    />
                  </Box>`
);

// Increase Accordion font sizes
content = content.replace(
  /<Typography variant='subtitle2' fontWeight=\{600\}>/g,
  '<Typography variant="subtitle1" fontWeight={700} fontSize="1.1rem">'
);
content = content.replace(
  /<Typography variant='body2' fontWeight=\{500\} noWrap>/g,
  '<Typography variant="body1" fontWeight={600} noWrap>'
);
content = content.replace(
  /<Typography variant='body2' fontWeight=\{500\}>/g,
  '<Typography variant="body1" fontWeight={600}>'
);

// Update Accordion expanded state block
content = content.replace(
  `const allExpanded = expandedSections.requests && expandedSections.quotes && expandedSections.jobs && expandedSections.invoices;\n\n  const handleToggleExpandAll = () => {\n    const val = !allExpanded;\n    setExpandedSections({ requests: val, quotes: val, jobs: val, invoices: val });\n  };\n\n  const [expandedSections, setExpandedSections] = useState({`,
  `  const [expandedSections, setExpandedSections] = useState({
    requests: false,
    quotes: false,
    jobs: false,
    invoices: false
  })

  // Has to be below state init
  const allExpanded = expandedSections.requests && expandedSections.quotes && expandedSections.jobs && expandedSections.invoices;

  const handleToggleExpandAll = () => {
    const val = !allExpanded;
    setExpandedSections({ requests: val, quotes: val, jobs: val, invoices: val });
  };`
);

fs.writeFileSync(file, content);
console.log('Update logic finished.');
