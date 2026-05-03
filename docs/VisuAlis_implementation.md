# VisuAlis
This project is connected with the AuTomato project at ../automation
It is an automation and integration framework. AuTomato is the backend, which compiles a visual workflow into a Go program
and this is the frontend designer part. VisuAlis lets you create Frontend Applications that interact with APIs, like the ones you create with AuTomato.

## Concept
### Components
The user visually designs a web page with basic components such as:
- Text input
- File upload
- Dropdown
- Checkbox
- Static Text box
- Video
- Table
- Button

Each component belongs to a class and has its own ID.

### Properties
Each one has properties, such as text (text input), selected options (dropdown), etc.
These properties are just the same as the HTML ones.
However, there are two types:
- Static (like color, position, etc.), which are defined on design.
- Variable, which just act like a variable and can be changed during runtime.

Properties can be changed in a tab on the right hand side, which also shows info about the component.
Values assigned to variable properties are just defaults.

### Actions
Then every component also has some triggers, which are paired to actions.
An action is like a function which gets executed. The user can hook up the individual triggers a component has (like onClick, etc.)
to an action, which the user defines. The function may have arguments, which come from the event.

The other values (properties of other components) are fetched using DOM.getElementById(...)

### Pages
The user may create a new project and in that project there are multiple pages.
The user can use a redirect action, to redirect to either another page or a totally different URL.

### Logic
The logic is oriented around the one in AuTomato, where there are connectable nodes.
Notably the concept is different: 

An action starts with an Origin node (like a trigger node in AuTomato), which carries the function parameters.
Other data the function may need it gets from GetValue and it sets them via SetValue.
When a control flow ends, the function returns.

VisuAlis leans more into ease of use is more laxed. It doesn't need every portion of data to be handed into the flow, 
but can get values from global (DOM). 
Also note that AuTomato-like tweaks still exist. However, we also have specific on-node fields (like the dropdowns described below).

New builtin nodes include:
- Fetch (url (STRING), method (DROPDOWN))
- GetValue (id (DROPDOWN)) → NOT FOUND | Value
- SetValue (id (DROPDOWN), field/parameter (DROPDOWN), value) → NOT FOUND | Nothing
- Terminate node (return nothing)

### Compilation
A project compiles to a not yet determined web app. However we DO want to use TypeScript.