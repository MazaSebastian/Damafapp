
import re

path = 'src/components/OrdersManager.jsx'

def check_structure():
    with open(path, 'r') as f:
        lines = f.readlines()

    stack = []
    # Map of closing to opening
    pairs = {')': '(', '}': '{', ']': '['}
    
    start_line = 598 # 0-indexed approx
    # Find exact start of return (
    for i, line in enumerate(lines):
        if 'return (' in line:
            start_line = i
            break
            
    print(f"Starting check from line {start_line+1}")
    
    in_string = False
    string_char = ''
    in_comment = False # /* */
    
    for i in range(start_line, len(lines)):
        line = lines[i]
        line_num = i + 1
        
        # Simple char by char state machine
        j = 0
        while j < len(line):
            char = line[j]
            
            # Handle comments / strings (simplified)
            # Todo: improved logic
            if not in_string and not in_comment:
                if line[j:j+2] == '//':
                    break # Skip rest of line
                if line[j:j+2] == '/*':
                    in_comment = True
                    j += 1
                    continue
                if char in "'\"`":
                    in_string = True
                    string_char = char
                    j += 1
                    continue

                if char in '({[':
                    stack.append((char, line_num, j))
                elif char in ')}]':
                    if not stack:
                        print(f"ERROR: Unexpected {char} at {line_num}:{j}")
                        return
                    last_open, last_line, last_col = stack.pop()
                    expected = pairs[char]
                    if last_open != expected:
                        print(f"ERROR: Mismatch at {line_num}:{j}. Found {char}, expected closing for {last_open} (from {last_line}:{last_col})")
                        return

            elif in_string:
                if char == string_char and line[j-1] != '\\':
                    in_string = False
            elif in_comment:
                if line[j:j+2] == '*/':
                    in_comment = False
                    j += 1
            
            j += 1
            
        if line_num == 1128:
            print(f"Stack at line 1128: {len(stack)} items")
            if stack:
                print("Open items:")
                for item in stack:
                    print(item)
            break

check_structure()
