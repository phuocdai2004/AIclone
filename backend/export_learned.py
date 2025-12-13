"""
Export Learned Q&A Data to CSV
Xuất dữ liệu học được từ các cuộc trò chuyện thành CSV
"""
import sqlite3
import csv
from datetime import datetime

DB_PATH = "database.db"

def export_learned_to_csv(output_file='learned_data.csv'):
    """Export learned Q&A from database to CSV"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Get learned data
        c.execute('''
            SELECT question, answer, confidence, created_at
            FROM learned_qa
            ORDER BY created_at DESC
        ''')
        
        rows = c.fetchall()
        conn.close()
        
        if not rows:
            print("❌ Không có dữ liệu learned")
            return False
        
        # Write to CSV
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['question', 'answer', 'confidence', 'created_at'])
            for row in rows:
                writer.writerow(row)
        
        print(f"✅ Export thành công!")
        print(f"📝 {len(rows)} Q&A pairs")
        print(f"💾 Lưu vào: {output_file}")
        
        # Show sample
        print("\n📊 Sample:")
        for i, row in enumerate(rows[:5], 1):
            print(f"{i}. Q: {row[0]}")
            print(f"   A: {row[1]}\n")
        
        return True
    
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return False

def merge_csv_files(learned_csv='learned_data.csv', training_csv='training_data.csv', output_csv='merged_training.csv'):
    """Merge learned data with existing training data"""
    try:
        all_qa = []
        
        # Read training data
        try:
            with open(training_csv, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get('question') and row.get('answer'):
                        all_qa.append((row['question'], row['answer']))
            print(f"✅ Loaded {len(all_qa)} từ training data")
        except:
            print(f"⚠️ Không tìm thấy {training_csv}")
        
        # Read learned data
        try:
            with open(learned_csv, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get('question') and row.get('answer'):
                        all_qa.append((row['question'], row['answer']))
            print(f"✅ Loaded learned data")
        except:
            print(f"⚠️ Không tìm thấy {learned_csv}")
        
        # Remove duplicates (keep first occurrence)
        seen = set()
        unique_qa = []
        for q, a in all_qa:
            if q.lower() not in seen:
                seen.add(q.lower())
                unique_qa.append((q, a))
        
        # Write merged data
        with open(output_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['question', 'answer'])
            for q, a in unique_qa:
                writer.writerow([q, a])
        
        print(f"\n✅ Merge thành công!")
        print(f"📝 Tổng {len(unique_qa)} Q&A (đã remove duplicates)")
        print(f"💾 Lưu vào: {output_csv}")
        
        return True
    
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Learned Data Manager")
    print("=" * 60)
    
    # Export learned data
    print("\n1️⃣ Export Learned Data")
    export_learned_to_csv()
    
    # Merge data
    print("\n2️⃣ Merge Training Data")
    merge_csv_files()
    
    print("\n" + "=" * 60)
    print("💡 Hướng dẫn:")
    print("1. Chat thêm để AI học thêm")
    print("2. Chạy: python export_learned.py")
    print("3. File learned_data.csv sẽ được tạo")
    print("4. File merged_training.csv - dữ liệu kết hợp")
    print("\nCó thể copy merged_training.csv → training_data.csv để train")
