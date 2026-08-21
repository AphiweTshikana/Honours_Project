import pandas as pd

# Read the file
df = pd.read_excel('data/teachers.xlsx')

# Update password_hash for all teachers to hash of "password"
password_hash = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
df['password_hash'] = password_hash

# Write back
df.to_excel('data/teachers.xlsx', index=False)
print("Updated teachers.xlsx with standard password hash")
print(df.to_string())
